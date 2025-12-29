import { Hono } from 'hono'
import { getSupabaseClient } from '../supabase.js'

const router = new Hono()

/**
 * GET /api/notes
 */
router.get('/', async (c) => {
    try {
        const supabase = getSupabaseClient(c.env);
        const sort = c.req.query('sort') || 'newest';
        let query = supabase.from('notes').select('*');

        if (sort === 'az') {
            query = query.order('title', { ascending: true });
        } else if (sort === 'za') {
            query = query.order('title', { ascending: false });
        } else if (sort === 'oldest') {
            query = query.order('created_at', { ascending: true });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data: notes, error } = await query;
        if (error) throw error;

        return c.json({
            success: true,
            data: notes || [],
            count: notes ? notes.length : 0
        });
    } catch (error) {
        console.error('Error fetching notes:', error);
        return c.json({ success: false, error: 'Failed to fetch notes' }, 500);
    }
});

/**
 * GET /api/notes/:id
 */
router.get('/:id', async (c) => {
    try {
        const supabase = getSupabaseClient(c.env);
        const id = c.req.param('id')
        const { data: note, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return c.json({ success: false, error: 'Note not found' }, 404);
            }
            throw error;
        }

        return c.json({ success: true, data: note });
    } catch (error) {
        console.error('Error fetching note:', error);
        return c.json({ success: false, error: 'Failed to fetch note' }, 500);
    }
});

/**
 * POST /api/notes
 */
router.post('/', async (c) => {
    try {
        const supabase = getSupabaseClient(c.env);
        const { title, content } = await c.req.json();
        if (!title || !content) {
            return c.json({ success: false, error: 'Both title and content are required' }, 400);
        }

        const { data: newNote, error } = await supabase
            .from('notes')
            .insert({ title: title.trim(), content: content.trim() })
            .select()
            .single();

        if (error) throw error;

        return c.json({ success: true, data: newNote }, 201);
    } catch (error) {
        console.error('Error creating note:', error);
        return c.json({ success: false, error: 'Failed to create note' }, 500);
    }
});

/**
 * PUT /api/notes/:id
 */
router.put('/:id', async (c) => {
    try {
        const supabase = getSupabaseClient(c.env);
        const id = c.req.param('id')
        const { title, content } = await c.req.json();
        if (!title || !content) {
            return c.json({ success: false, error: 'Both title and content are required' }, 400);
        }

        const { data: updatedNote, error } = await supabase
            .from('notes')
            .update({ title: title.trim(), content: content.trim() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return c.json({ success: false, error: 'Note not found' }, 404);
            }
            throw error;
        }

        return c.json({ success: true, data: updatedNote });
    } catch (error) {
        console.error('Error updating note:', error);
        return c.json({ success: false, error: 'Failed to update note' }, 500);
    }
});

/**
 * DELETE /api/notes/:id
 */
router.delete('/:id', async (c) => {
    try {
        const supabase = getSupabaseClient(c.env);
        const id = c.req.param('id')
        const { error } = await supabase.from('notes').delete().eq('id', id);
        if (error) throw error;
        return c.json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        return c.json({ success: false, error: 'Failed to delete note' }, 500);
    }
});

export default router
